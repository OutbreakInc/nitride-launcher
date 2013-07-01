#!/bin/sh
# prepares files in this repository for bundling as a node-webkit application

find . | grep -v -E "/\.|\./prepare-module\.sh|/benches|/examples|/test|/tests" | xargs zip ../app.nw
