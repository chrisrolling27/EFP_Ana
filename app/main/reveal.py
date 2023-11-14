import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass, get_adyen_api_key, get_adyen_merchant_account
from flask import Flask, render_template, url_for, redirect
from main import database

'''
Get public key
'''

def get_key():
  url = "https://balanceplatform-api-test.adyen.com/bcl/v1/publicKey?purpose=panReveal"

  user = get_bp_user()
  password = get_bp_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  print("/publicKey request:\n" + str(url))

  response = requests.get(url, headers = headers, auth=basic)

  print("/publicKey response:\n" + response.text, response.status_code, response.reason)

  node = json.loads(response.text)
  key = node['publicKey']

  
  if response.status_code == 422:
    node = json.loads(response.text)
    reason = node['invalidFields'][0]['message']
    print(reason)
    return reason
  if response.status_code == 200:
    print(key)
    return key
  else:
    return response.text

def reveal_pan(card_id, encrypted_aes):
  url = "https://balanceplatform-api-test.adyen.com/bcl/v1/paymentInstruments/reveal"

  user = get_bp_user()
  password = get_bp_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "paymentInstrumentId": card_id,
    "encryptedKey": encrypted_aes
  }

  print("/reveal request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/reveal response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  card_encrypted = node['encryptedData']
  print(card_encrypted)
  if response.status_code == 200:
    return card_encrypted
  else:
    return response.text



