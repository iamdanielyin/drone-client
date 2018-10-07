#!/bin/bash

ver="0.0.22"
tag="yinfxs/drone-client:$ver"
cd ./ui && cnpm i && npm run build && cd ../
cd ./f7 && cnpm i && npm run build && cd ../
GOOS=linux GOARCH=amd64 go build
docker build -t $tag .
docker push $tag