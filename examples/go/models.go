package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"size:100;not null"`
	Email     string    `gorm:"size:255;uniqueIndex;not null"`
	IsActive  bool      `gorm:"default:true"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Orders    []Order   `gorm:"foreignKey:UserID"`
}

type Order struct {
	ID          uint      `gorm:"primaryKey"`
	UserID      uint      `gorm:"not null"`
	User        User      `gorm:"foreignKey:UserID"`
	OrderNumber string    `gorm:"size:50;uniqueIndex;not null"`
	Amount      float64   `gorm:"not null"`
	Status      string    `gorm:"size:20;default:'pending'"`
	CreatedAt   time.Time
}
