#!/bin/sh

PATH=$PATH:/Applications/ArangoDB-CLI.app/Contents/MacOS/
export PATH

# goto lying directory
cd -- "$(dirname "$0")"


# self-leverage, make double-clickable in OS X
chmod +x db_restore.command
cd ..
clear

echo ----------------

echo "This script RESTORES ArangoDB database (listening on 8529) from the /dump directory."
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
  # ${ARANGOPATH}arangodump --overwrite true --server.database nkc --output-directory "dump"
  arangorestore --server.database nkc --create-database true --input-directory "dump"
fi

echo ----------------
