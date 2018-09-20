package main

import (
	"fmt"
	"log"
	"time"

	"github.com/boltdb/bolt"
)

var (
	db         *bolt.DB
	bucketName = "global"
)

// InitDB 初始化数据库
func initDB() {
	var err error
	db, err = bolt.Open("data.db", 0600, nil)
	if err != nil {
		log.Fatal(err)
	}
	Set("time", time.Now().Format("2006-01-02 15:04:05"))
}

// Set 设置值
func Set(k, v string) {
	db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		if b == nil {
			b, _ = tx.CreateBucket([]byte(bucketName))
		}
		err := b.Put([]byte(k), []byte(v))
		return err
	})
}

// Get 获取值
func Get(k string) string {
	var sv string
	db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(bucketName))
		v := b.Get([]byte(k))
		fmt.Printf("The answer is: %s\n", v)
		sv = string(v)
		return nil
	})
	return sv
}
