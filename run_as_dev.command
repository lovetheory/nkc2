#!/bin/sh
cd -- "$(dirname "$0")"
export NODE_ENV=development
set NODE_ENV=development
while true; do
  echo Starting...
  node server.js
done
