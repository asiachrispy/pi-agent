#!/usr/bin/env bash
# scripts/find-free-port.sh — 从起始端口探测第一个空闲端口
# 用法: bash scripts/find-free-port.sh [start_port] [max_attempts]
# 默认 start=30142, max=5

START_PORT="${1:-30142}"
MAX_ATTEMPTS="${2:-5}"

port=$START_PORT
for ((i=0; i<MAX_ATTEMPTS; i++)); do
  if ! lsof -i :$port -P -n >/dev/null 2>&1; then
    echo $port
    exit 0
  fi
  ((port++))
done

echo "ERROR: no free port in range $START_PORT-$((START_PORT + MAX_ATTEMPTS - 1))" >&2
exit 1
