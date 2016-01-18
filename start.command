#!/bin/sh
cd -- "$(dirname "$0")"
while true; do
  echo Starting...
  node server.js
done
