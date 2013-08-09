#!/bin/sh
# prepares files in this repository for bundling as a node-webkit application

version=`echo 'console.log(require("./package.json").version)' | node`
find . | grep -v -E "/\.|\./prepare-module\.sh|/benches|/examples|/test|/tests" | xargs zip ../Logiblock-IDE-$version-node-webkit.nw
