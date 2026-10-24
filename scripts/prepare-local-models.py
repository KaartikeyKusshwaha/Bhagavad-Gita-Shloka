"""Prepare pinned, existing Apache-2.0 Qwen models for a local college demo.

Portable runtime/model downloads stay under ignored .local/models. No system
installation, service registration, model training or API account is involved.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import shutil
import urllib.request
import zipfile
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / '.local/models'
DEST.mkdir(parents=True, exist_ok=True)
FILES = [
    dict(name='llama-cpu.zip', size=24178470, sha256='1cbccd846631eec291ecc339a0e3bc2c66f4a916808cb66aad1c1e8f19f0c8f4',
         url='https://github.com/ggml-org/llama.cpp/releases/download/b11857/llama-b11857-bin-win-cpu-x64.zip', license='MIT'),
    dict(name='Qwen3-1.7B-Q8_0.gguf', size=1834426016, sha256='061b54daade076b5d3362dac252678d17da8c68f07560be70818cace6590cb1a',
         url='https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/90862c4b9d2787eaed51d12237eafdfe7c5f6077/Qwen3-1.7B-Q8_0.gguf', license='Apache-2.0'),
    dict(name='Qwen3-Embedding-0.6B-Q8_0.gguf', size=639150592, sha256='06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439',
         url='https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/370f27d7550e0def9b39c1f16d3fbaa13aa67728/Qwen3-Embedding-0.6B-Q8_0.gguf', license='Apache-2.0'),
]
if '--vulkan' in sys.argv:
    FILES.append(dict(name='llama-vulkan.zip',size=36995764,
        sha256='6d90c98f2eaa19389f426f5b1daa8721226ed7e4a491d181bc0efa13eda6c453',
        url='https://github.com/ggml-org/llama.cpp/releases/download/b11857/llama-b11857-bin-win-vulkan-x64.zip',license='MIT'))


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def download(item):
    target = DEST / item['name']
    if target.exists():
        if target.stat().st_size != item['size'] or digest(target) != item['sha256']:
            raise ValueError(f"Existing file differs from pinned model: {target.name}")
        print(f"Verified existing {target.name}", flush=True)
        return
    partial = target.with_suffix(target.suffix + '.part')
    downloaded, reported = 0, 0
    with urllib.request.urlopen(item['url'], timeout=60) as response, partial.open('wb') as output:
        while chunk := response.read(4 * 1024 * 1024):
            output.write(chunk)
            downloaded += len(chunk)
            if downloaded - reported >= 128 * 1024 * 1024:
                print(f"{target.name}: {downloaded // (1024*1024)} MiB", flush=True)
                reported = downloaded
    if partial.stat().st_size != item['size'] or digest(partial) != item['sha256']:
        raise ValueError(f"Download checksum mismatch: {target.name}")
    partial.rename(target)
    print(f"Verified {target.name}", flush=True)


if __name__ == '__main__':
    if shutil.disk_usage(DEST).free < 4 * 1024**3:
        raise RuntimeError('At least 4 GiB of free workspace disk space is required.')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(download, FILES))
    runtimes=[('llama-cpu.zip','runtime')]
    if '--vulkan' in sys.argv:
        runtimes.append(('llama-vulkan.zip','runtime-vulkan'))
    for archive_name,folder in runtimes:
        runtime = (DEST / folder).resolve()
        runtime.mkdir(exist_ok=True)
        if not (runtime/'llama-server.exe').exists():
            with zipfile.ZipFile(DEST / archive_name) as archive:
                for member in archive.infolist():
                    target = (runtime / member.filename).resolve()
                    if not target.is_relative_to(runtime) or (member.external_attr >> 16) & 0o170000 == 0o120000:
                        raise ValueError('Unsafe archive member')
                archive.extractall(runtime)
    (DEST / 'provenance.json').write_text(json.dumps(FILES, indent=2) + '\n', encoding='utf8', newline='\n')
    print('Portable local model files are ready.', flush=True)
