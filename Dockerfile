FROM alpine

RUN echo "http://mirrors.aliyun.com/alpine/v3.6/main/" > /etc/apk/repositories \
    && apk update && apk add ca-certificates tzdata \
    && rm -f /etc/localtime \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN mkdir -p /app/ui
WORKDIR /app
COPY ./drone-client /app
COPY ./ui/dist /app/ui

EXPOSE 3000
CMD [ "./drone-client" ]