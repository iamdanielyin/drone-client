package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// 全局配置信息
var (
	droneScheme = os.Getenv("DRONE_SCHEME")
	droneHost   = os.Getenv("DRONE_HOST")
	droneToken  = os.Getenv("DRONE_TOKEN")
	apiPrefix   = os.Getenv("API_PREFIX")
	apiTrigger  = os.Getenv("API_TRIGGER")
	corpID      = os.Getenv("CORP_ID")
	corpSecret  = os.Getenv("CORP_SECRET")
	agentID     = os.Getenv("AGENT_ID")
)

// 模块加载函数
func init() {
	initConfig()
	initDB()
}

// 配置检测
func initConfig() {
	const defaultPrefix = "/api"
	if apiPrefix == "" {
		apiPrefix = defaultPrefix
	}
	const defaultTrigger = "/drone"
	if apiTrigger == "" {
		apiTrigger = defaultTrigger
	}
}

// 代理实例
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

// 获取用户信息
func getUserInfo(accessToken string, code string) (gin.H, error) {
	resp, err := http.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=%s&code=%s", accessToken, code))
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	result := gin.H{}
	if err := json.Unmarshal([]byte(body), &result); err != nil {
		log.Fatal(err)
		return nil, err
	}
	return result, nil
}

// 获取企业微信access_token
func getToken() string {
	tokenKey := "wwtoken"
	dateFormat := "2006-01-02 15:04:05"
	token := Get(tokenKey)

	if token != "" {
		split := strings.Split(token, "|")
		expiresDate, err := time.Parse(dateFormat, split[1])
		if err == nil && time.Now().Before(expiresDate) {
			return split[0]
		}
	}

	resp, err := http.Get(fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", corpID, corpSecret))
	if err != nil {
		log.Fatal(err)
		return ""
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
		return ""
	}
	result := gin.H{}
	if err := json.Unmarshal([]byte(body), &result); err != nil {
		log.Fatal(err)
		return ""
	}
	accessToken := result["access_token"].(string)
	expiresIn := time.Now().Add(time.Duration(result["expires_in"].(float64)) * time.Second)
	expiresFormat := expiresIn.Format(dateFormat)
	tokenValue := fmt.Sprintf("%s|%s", accessToken, expiresFormat)
	Set(tokenKey, tokenValue)
	return accessToken
}

// 入口函数
func main() {
	defer db.Close()
	engine := gin.New()
	engine.Static("/ui", "./ui")
	engine.Static("/f7", "./f7")
	vi := engine.Group(apiPrefix)
	vi.GET("/login", func(c *gin.Context) {
		token := getToken()
		data, err := getUserInfo(token, c.Query("code"))
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"errcode": 500,
				"errmsg":  "Invalid code",
			})
		}
		userID := data["UserId"].(string)
		authToken := Get(userID)
		c.Redirect(http.StatusMovedPermanently, fmt.Sprintf("/f7/?user_id=%s&auth_token=%s#!/", userID, authToken))
	})
	vi.Any(fmt.Sprintf("%s/*api", apiTrigger), func(c *gin.Context) {
		simpleHostProxy.ServeHTTP(c.Writer, c.Request)
	})
	err := engine.Run(":3000")
	if err != nil {
		log.Println(err)
	}
}
