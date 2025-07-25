import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass, get_adyen_api_key, get_adyen_merchant_account
from flask import Flask, render_template, url_for, redirect, session
from flask_session import Session
from main import database

'''
Partner Model onboarding Flow
'''

def store_create(
                lem_id,
                reference,
                description,
                shopperStatement,
                phoneNumber,
                line1,
                city,
                postalCode,
                country,
                schemes,
                currencies,
                countries,
                businessLine):

  url = "https://management-test.adyen.com/v1/stores"

  apiKey = get_adyen_api_key()
  merchant = get_adyen_merchant_account()

  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
  }

  payload = {
    "merchantId": merchant,
    "description": description,
    "shopperStatement": shopperStatement,
    "phoneNumber": phoneNumber,
    "reference": reference,
    "address": {
        "line1": line1,
        "city": city,
        "country": country,
        "postalCode": postalCode
    },
    "businessLineIds": [
        businessLine
    ]
}

  print("/stores request:\n" + str(payload))
  requestPayload = str(payload)
  session['stReq'] = json.dumps(payload, indent=2)

  response = requests.post(url, data = json.dumps(payload), headers = headers)

  print("/stores response:\n" + response.text, response.status_code, response.reason)
  responsePayload = response.text
  responseCode = response.status_code
  
  node = json.loads(response.text)
  print(response.headers)
  if response.status_code == 422:
    node = json.loads(response.text)
    reason = node['invalidFields'][0]['InvalidField']['message']
    print(reason)
    return reason
  if response.status_code == 201 or 200:
      storeId = node['id']
      storeDB = database.insert_store(storeId, lem_id, reference)
      session['stRes'] = json.dumps(node, indent=2)
      print(storeId)
      for scheme in schemes:
        payment_method(scheme, businessLine, storeId, currencies, countries)
        continue
      return redirect(url_for('onboard_success', LEMid=lem_id))
  else:
    return response.text

def payment_method(scheme, businessLine, storeId, currencies, countries):
  merchantId = get_adyen_merchant_account()
  url = f"https://management-test.adyen.com/v1/merchants/{merchantId}/paymentMethodSettings"

  apiKey = get_adyen_api_key()
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
  }

  payload = {
    "businessLineId":businessLine,
    "type": scheme,
    "storeId":storeId,
    "currencies": currencies,
    "countries": countries
}

  print("/paymentMethodSettings request:\n" + str(payload))
  if 'pmReq2' in session:
    session['pmReq3'] = json.dumps(payload, indent=2)
  if 'pmReq' in session:
    session['pmReq2'] = json.dumps(payload, indent=2)
  else: 
    session['pmReq'] = json.dumps(payload, indent=2)

  response = requests.post(url, data = json.dumps(payload), headers = headers)

  print("/paymentMethodSettings response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  print(response.headers)
  if response.status_code == 200:
      if 'pmRes2' in session:
        session['pmRes3'] = json.dumps(node, indent=2)
        return response.text
      if 'pmRes' in session:
        session['pmRes2'] = json.dumps(node, indent=2)
        return response.text
      else:  
        session['pmRes'] = json.dumps(node, indent=2)
        return response.text
  else:
    return response.text


def get_stores_for_le(storeId):
  merchantId = get_adyen_merchant_account()
  url = f"https://management-test.adyen.com/v1/merchants/{merchantId}/stores/{storeId}"

  apiKey = get_adyen_api_key()
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
  }

  print("/store request:\n")

  response = requests.get(url, headers = headers)

  print("/store response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  print(response.headers)
  if response.status_code == 200:
    return response.text
  else:
    return response.text


