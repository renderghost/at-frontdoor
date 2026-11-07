#!/usr/bin/env bash
# POST SVG carriers to upload_assets submit URLs in parallel.
# Usage: upload.sh <carrierDir> name1 url1 name2 url2 ...
dir="$1"; shift
fail=0
while [ $# -ge 2 ]; do
  name="$1"; url="$2"; shift 2
  (
    out=$(curl -sS -X POST -F "file=@${dir}/${name}.svg;type=image/svg+xml" "$url")
    case "$out" in
      *'"success":true'*) echo "ok ${name}" ;;
      *) echo "FAIL ${name}: ${out:0:200}" ;;
    esac
  ) &
done
wait
