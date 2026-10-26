#!/usr/bin/env bash
set -euo pipefail
install -d -m 755 /opt/open-scripture-models /opt/open-scripture-models/runtime
python3 - <<'PY'
from pathlib import Path
import hashlib,tarfile,urllib.request
root=Path('/opt/open-scripture-models')
files=[
 ('llama-b11857-bin-ubuntu-x64.tar.gz','https://github.com/ggml-org/llama.cpp/releases/download/b11857/llama-b11857-bin-ubuntu-x64.tar.gz','d2f82dbe8fa95738cccfc9e8b14d1186d85d56cd1d19acdebb4ddf24b0a0453e'),
 ('Qwen3-Embedding-0.6B-Q8_0.gguf','https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/370f27d7550e0def9b39c1f16d3fbaa13aa67728/Qwen3-Embedding-0.6B-Q8_0.gguf','06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439')]
for name,url,digest in files:
    path=root/name
    if not path.exists():
        partial=path.with_suffix('.part')
        with urllib.request.urlopen(url,timeout=60) as response,partial.open('wb') as output:
            while chunk:=response.read(4*1024*1024):output.write(chunk)
        partial.rename(path)
    actual=hashlib.file_digest(path.open('rb'),'sha256').hexdigest()
    assert actual==digest, f'Checksum mismatch: {name}'
    print('Verified '+name,flush=True)
with tarfile.open(root/files[0][0]) as archive:
    archive.extractall(root/'runtime',filter='data')
PY
echo 'Pinned existing model downloaded. The resource/latency trial is a separate step.'
