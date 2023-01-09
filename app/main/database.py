import sqlite3
import json

# location of SQLite database file
_path_to_db_file = None


# function to set path to database file
def set_path_to_db_file(path_to_db_file):
    global _path_to_db_file
    _path_to_db_file = path_to_db_file

# function to execute an SQL statement
def _execute_sql(sql, read):
    with sqlite3.connect(_path_to_db_file) as conn:
        cursor = conn.cursor()
        cursor.execute(sql)
        if read == 'true':
            output = cursor.fetchall()
            return output
        cursor.close()

# function to create database table
def create_table():
    sql_create_table = """CREATE TABLE users(username PRIMARY KEY, password NOT NULL, lem_id NOT NULL);"""
    _execute_sql(sql_create_table)

# function to insert a user into the database table
def insert_user(username, password, lem_id):
    sql_insert_user = "INSERT INTO users VALUES ('" + username + "', '" + password + "', '" + lem_id + "');"
    _execute_sql(sql_insert_user)

# function to validate login details and retrieve lemId
def get_user(email, password):
    sql_get_user = "SELECT * FROM users"
    read = 'true'
    listData = _execute_sql(sql_get_user, read)
    storedEmails = [item[0] for item in listData]
    storedPasswords = [item[1] for item in listData]
    storedLEMs = [item[2] for item in listData]
    email = email
    if email in storedEmails:
        index = storedEmails.index(email)
        checkPassword = storedPasswords[index]
        if checkPassword == password:
            lem = storedLEMs[index]
            return lem
        else:
            return 'error'
    else:
        return 'user error'
