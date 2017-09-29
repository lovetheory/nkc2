#!/bin/sh
# add this script to /etc/rc.d/rc.local
# to start everything on system init

# goto lying directory
cd -- "$(dirname "$0")"

sh centos-start-arangodb-service.sh
cd ..
sh run_as_production.sh
