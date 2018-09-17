package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// 模块加载函数
func init() {
	detectConfig()
}

// 全局配置信息
var (
	droneScheme = os.Getenv("DRONE_SCHEME")
	droneHost   = os.Getenv("DRONE_HOST")
	droneToken  = os.Getenv("DRONE_TOKEN")
	apiPrefix   = os.Getenv("API_PREFIX")
	apiTrigger  = os.Getenv("API_TRIGGER")
)

// 代理服务器
var simpleHostProxy = httputil.ReverseProxy{
	Director: func(req *http.Request) {
		req.URL.Scheme = droneScheme
		if req.Header.Get("Authorization") == "" && droneToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", droneToken))
		}
		req.URL.Host = droneHost
		req.URL.Path = strings.Replace(req.URL.Path, fmt.Sprintf("%s%s", apiPrefix, apiTrigger), "/api", 1)
		req.Host = droneHost
	},
}

// 配置检测
func detectConfig() {
	const defaultPrefix = "/api"
	if apiPrefix == "" {
		apiPrefix = defaultPrefix
	}
	const defaultTrigger = "/drone"
	if apiTrigger == "" {
		apiTrigger = defaultTrigger
	}
}

// 入口函数
func main() {
	engine := gin.New()
	vi := engine.Group(apiPrefix)
	vi.Any(fmt.Sprintf("%s/*api", apiTrigger), func(c *gin.Context) {
		simpleHostProxy.ServeHTTP(c.Writer, c.Request)
	})
	err := engine.Run()
	if err != nil {
		fmt.Println(err)
	}
}
