#!/bin/sh

# goto lying directory
cd -- "$(dirname "$0")"

sh centos-start-arangodb-service.sh
sh ../run_as_production.sh
