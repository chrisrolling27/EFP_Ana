import Adyen
import json
import uuid
import requests
from main.config import get_adyen_api_key, get_adyen_merchant_account

'''
Generate PayByLink
'''

def legal_entities():
    url = "https://kyc-test.adyen.com/lem/v2/legalEntities"

    xapikey = get_adyen_api_key()
    platform = "test" # change to live for production
    merchant_account = get_adyen_merchant_account()

    headers = {
        'Authorization': basicLEMauth,
        'X-API-Key': xapikey,
        'Content-Type': 'application/json'
    }

    payload = {
    "type": "individual",
    "individual": {
      "residentialAddress": {
        "city": "London",
        "country": "GB",
        "postalCode": "NW1 5UI",
        "stateOrProvince": "LON",
        "street": "1 Street Name"
      },
      "phone": {
        "number": "+445645676556",
        "type": "mobile"
      },
      "name": {
        "firstName": "Test",
        "lastName": "CEO"
      },
      "birthData": {
        "dateOfBirth": "1991-12-01"
      },
      "email": "a.ceo@example.com"
    }
}

    print("/legalEntities request:\n" + str(payload))

    response = requests.post(url, data = json.dumps(payload), headers = headers)

    print("/legalEntities response:\n" + response.text, response.status_code, response.reason)
    
    node = json.loads(response.text)
    pblink = node['url']
    IndividualLEMid = node['id']
    print(pblink)
    print(IndividualLEMid)

    return response.text

#adyen_payment_links()
