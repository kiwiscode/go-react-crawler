package models

import "time"

type User struct {
    ID        int       `db:"id" json:"id"`
    Username  string    `db:"username" json:"username"`
    Email     string    `db:"email" json:"email"`
    Password  string    `db:"password" json:"-"`
    CreatedAt time.Time `db:"created_at" json:"created_at"`

    URLs []URL          `json:"urls,omitempty"`
}
