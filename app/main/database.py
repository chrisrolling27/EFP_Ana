import sqlite3

# location of SQLite database file
_path_to_db_file = None

# function to set path to database file
def set_path_to_db_file(path_to_db_file):
    global _path_to_db_file
    _path_to_db_file = path_to_db_file

# function to execute an SQL statement
def _execute_sql(sql):
    with sqlite3.connect(_path_to_db_file) as conn:
        cursor = conn.cursor()
        cursor.execute(sql)
        cursor.close()

# function to create database table
def create_table():
    sql_create_table = """CREATE TABLE users(username PRIMARY KEY, password NOT NULL, lem_id NOT NULL);"""
    _execute_sql(sql_create_table)

# function to insert a user into the database table
def insert_user(username, password, lem_id):
    sql_insert_user = "INSERT INTO users VALUES ('" + username + "', '" + password + "', '" + lem_id + "');"
    _execute_sql(sql_insert_user)