#!/bin/sh

# goto lying directory
cd -- "$(dirname "$0")"

# self-leverage, make double-clickable in OS X
chmod +x db_dump.command
cd ..

clear

echo ----------------

echo "This script DUMPS ArangoDB database (listening on 8529) to the /dump directory."
echo "Don't continue unless you know what you are doing."
echo
read -p "Are you sure?(y/N)" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo Cancelled.
else
  #dangerous stuff here

  #execute
  arangodump --overwrite true --server.database nkc --output-directory "dump"
fi

echo ----------------
