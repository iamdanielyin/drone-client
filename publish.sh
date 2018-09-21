#!/bin/bash

ver="0.0.2"
tag="yinfxs/drone-client:$ver"
cd ./ui && npm i && npm run build && cd ../
GOOS=linux GOARCH=amd64 go build
docker build -t $tag .
docker push $tag