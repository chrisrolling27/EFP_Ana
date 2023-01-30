import Adyen
import json
import uuid
import requests
from main.config import get_basic_lem_auth, get_lem_user, get_lem_pass, get_bp_user, get_bp_pass, get_adyen_api_key, get_adyen_merchant_account
from flask import Flask, render_template, url_for, redirect

'''
Partner Model onboarding Flow
'''

def business_line(industryCode,
                webAddress,
                lem_id,
                reference,
                description,
                channel,
                shopperStatement,
                phoneNumber,
                line1,
                city,
                postalCode,
                country,
                schemes,
                currencies,
                countries):
  url = "https://kyc-test.adyen.com/lem/v2/businessLines"

  user = get_lem_user()
  password = get_lem_pass()

  basic = (user, password)
  platform = "test" # change to live for production

  headers = {
      'Content-Type': 'application/json'
  }

  payload = {
    "capability": "receivePayments",
    "salesChannels": [channel],
    "industryCode": industryCode,
    "legalEntityId": lem_id,
    "webData": [
        {
        "webAddress": webAddress
        }
    ]
    }

  print("/businessLines request:\n" + str(payload))

  response = requests.post(url, data = json.dumps(payload), headers = headers, auth=basic)

  print("/businessLines response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  businessLine = node['id']
  print(businessLine)
  print(response.headers)
  if response.status_code == 200:
    store_create(reference, description, shopperStatement, phoneNumber, line1, city, country, postalCode, businessLine, schemes, currencies, countries)
    return redirect(url_for('onboard_success', LEMid=lem_id))
  else:
    return response.text

def store_create(reference, description, shopperStatement, phoneNumber, line1, city, country, postalCode, businessLine, schemes, currencies, countries):
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

  response = requests.post(url, data = json.dumps(payload), headers = headers)

  print("/stores response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  storeId = node['id']
  print(storeId)
  print(response.headers)
  if response.status_code == 201 or 200:
      for scheme in schemes:
        payment_method(scheme, businessLine, storeId, currencies, countries)
        continue
        return response.text
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

  response = requests.post(url, data = json.dumps(payload), headers = headers)

  print("/paymentMethodSettings response:\n" + response.text, response.status_code, response.reason)
  
  node = json.loads(response.text)
  print(response.headers)
  if response.status_code == 200:
    return response.text
  else:
    return response.text


