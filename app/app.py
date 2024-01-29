import logging
import sqlite3
from os.path import exists

from Adyen.util import is_valid_hmac_notification
from flask import Flask, render_template, send_from_directory, request

import json
import re

from main import database
from main import config
from main.config import *
from main.onboard import go_to_link
from main.register import legal_entity
from main.store import *
from main.business import *
from main.card import *
from main.reveal import *

legalName =""


def create_app():
    logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    app = Flask('app')

    # Register 404 handler
    app.register_error_handler(404, page_not_found)

    # Routes:
    @app.route('/')
    def home():
        return render_template('login.html')

    @app.route('/login')
    def login():
        return render_template('login.html')
    
    @app.route('/registerForm')
    def registerForm():
        return render_template('registerForm.html')

    @app.route('/ledata', methods=['POST'])
    def legal_entities():
        if request.method == 'POST':

            # get variables from request
            legalName = request.form['legalName']
            email = request.form['email']
            password = request.form['password']
            currency = request.form['currency']
            country = request.form['country']

            # create legal entity, account holder etc and get redirect response
            redirect_response = legal_entity(legalName, currency, country)

            # get location from redirect response
            location = redirect_response.location


            # if creation was successful, extract LEM ID
            if "/result/success?LEMid=" in location:

                # substring LEM ID (ugly but works)
                lem_id = location[22:]

                # insert login data into database
                database.insert_user(email, password, lem_id)

                # insert legal entity data into database
                database.insert_le(lem_id, legalName, country, currency)

            return redirect_response

    @app.route('/getData', methods=['POST'])
    def get_data():
        # get variables from form
        email = request.form['email']
        password = request.form['password']
        # send data to be validated vs the database
        loginData = database.get_user(email, password)
        # resolve depending on the validation
        if loginData == 'error':
            return render_template('login.html', passError=True)
        if loginData == 'user error':
            return render_template('login.html', userError=True)
        else:
            # success! get the lem ID of the logged user
            lem = loginData
            return render_template('onboard-success.html', lem=lem)

    @app.route('/getStores', methods=['POST', 'GET'])
    def get_stores():
        return 

    @app.route('/testButton/<lem>', methods=['POST', 'GET'])
    def test_button(lem):
        lem_id = lem
        result = database.get_stores(lem_id)
        print("this is the result ", result)
        res = [sub['storeName'] for sub in result ]
        return render_template('onboard-success.html', result=res)

    @app.route('/forceDelete', methods=['POST', 'GET'])
    def force_delete():
        database.force_delete_table()
        return render_template('onboard-success.html')

    @app.route('/forceCreate', methods=['POST', 'GET'])
    def force_create():
        database.force_create_table()
        return render_template('onboard-success.html')

    @app.route('/result/success', methods=['GET', 'POST'])
    def onboard_success():
        lem = request.args['LEMid']
        result = database.get_stores(lem)
        print("this is the result ", result)
        res = [sub['storeName'] for sub in result ]
        return render_template('onboard-success.html', lem=lem, newUser=True, result=res)

    @app.route('/dashboard', methods=['GET', 'POST'])
    def dashboard():
        lem = request.args['LEMid']
        result = database.get_stores(lem)
        res = [sub['storeName'] for sub in result ]
        print("this is the res ", res)
        existing_cards = database.get_cards(lem)
        if existing_cards == []:
            card_data = 'no_cards'
        else:
            print("Existing cards", str(existing_cards[0][0]))
            data = database.get_card_data(str(existing_cards[0][0]))
            data_obj = data[0][0]
            data_json = json.loads(data_obj)
            last_four = data_json.get("card").get("lastFour")
            month = data_json.get("card").get("expiration").get("month")
            year = data_json.get("card").get("expiration").get("year")
            cardholder = data_json.get("card").get("cardholderName")
            brand = data_json.get("card").get("brand")
            card_data = [last_four, month, year, cardholder, brand]
        print(card_data)
        return render_template('dashboard.html', lem=lem, newUser=False, result=res, card_data=card_data)

    @app.route('/onboard/<lem>', methods=['POST', 'GET'])
    def onboard_link(lem):
        if request.method == 'POST':
            LEMid = lem
        return go_to_link(LEMid)

    @app.route('/getPub')
    def get_pub_key():
        redirect_response = get_key()
        return redirect_response

    @app.route('/reveal', methods=['POST', 'GET'])
    def reveal_card():
        jsdata = request.form['javascript_data']
        print(jsdata)
        data_json = json.loads(jsdata)
        encrypted_aes = data_json.get("encrypted_aes")
        lem = data_json.get("lem")
        card_list = database.get_cards(lem)
        pi = card_list[0]
        print("pi", pi)
        pi_string = next(iter(pi))
        print("pi_string", pi_string)
        redirect_response = reveal_pan(pi_string, encrypted_aes)
        print(redirect_response)
        print('the payment instrument here', pi_string)
        return redirect_response

    @app.route('/postmethod', methods = ['POST'])
    def get_post_javascript_data():
        jsdata = request.form['javascript_data']
        print(jsdata)
        return jsdata

    @app.route('/businessData/<lem>', methods=['POST'])
    def new_business(lem):
        if request.method == 'POST':
            lem_id = lem
            channel = request.form['channel']
            webAddress = request.form['webAddress']
            industryCode = request.form['industryCode']

            redirect_response = business_line(
                industryCode,
                webAddress,
                lem_id,
                channel)

        return redirect_response
            # return render_template('onboard-success.html', lem=lem)

    @app.route('/storeData/<lem>', methods=['POST'])
    def new_store(lem):
        if request.method == 'POST':
            # lem_id = request.base_url
            # print(lem_id)

            # get variables from request
            lem_id = lem
            businessData = database.get_business(lem_id)

            reference = request.form['reference']
            description = request.form['description']
            # channel = request.form['channel']
            # webAddress = request.form['webAddress']
            shopperStatement = request.form['shopperStatement']
            phoneNumber = request.form['phoneNumber']
            line1 = request.form['line1']
            city = request.form['city']
            postalCode = request.form['postalCode']
            country = request.form['country']
            # industryCode = request.form['industryCode']
            schemes = []
            if request.form.get('visa'):
                schemes.append('visa')
            if request.form.get('mc'):
                schemes.append('mc')
            if request.form.get('amex'):
                schemes.append('amex')
            currencies = []
            if request.form.get('GBP'):
                currencies.append('GBP')
            if request.form.get('EUR'):
                currencies.append('EUR')
            if request.form.get('USD'):
                currencies.append('USD')
            countries = []
            if request.form.get('GB'):
                countries.append('GB')
            if request.form.get('NL'):
                countries.append('NL')
            if request.form.get('US'):
                countries.append('US')
            

            # create business line, store, payment methods and get redirect response
            redirect_response = store_create(
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
                businessData)

            return redirect_response


    @app.route('/issue/<lem>', methods=['POST'])
    def new_card(lem):
        if request.method == 'POST':
            # get variables from database
            result = database.get_le(lem)
            print(result[0])
            print(result[1])
            country = result[1]

            # get balance account ID from database
            balance_account = database.get_ba(lem)
            print(balance_account)

            # get variables from UI request
            card_holder = request.form['cardHolderName']
            scheme = request.form['cardScheme']
            factor = request.form['cardType']
            if factor == 'Virtual':
                factor = 'virtual'
            if scheme == 'Mastercard': 
                brand = 'mc'
                variant = 'mc_debit_mdt'
                # create payment instrument with all data
                redirect_response = create_card(balance_account, brand, variant, card_holder, country, factor, lem)
                print(redirect_response)

                return redirect(url_for('dashboard', LEMid=lem))
            else:
                return render_template('checkout-failed.html')

    @app.route('/cards', methods=['POST', 'GET'])
    def cards_view():
        lem = request.args['LEMid']
        existing_cards = database.get_cards(lem)
        if existing_cards == []:
            card_data = 'no_cards'
        else:
            print("Existing cards", str(existing_cards[0][0]))
            card_array = []
            for card in existing_cards:
                data = database.get_card_data(card[0])
                data_obj = data[0][0]
                data_json = json.loads(data_obj)
                last_four = data_json.get("card").get("lastFour")
                month = data_json.get("card").get("expiration").get("month")
                year = data_json.get("card").get("expiration").get("year")
                cardholder = data_json.get("card").get("cardholderName")
                brand = data_json.get("card").get("brand")
                each_card = [last_four, month, year, cardholder, brand]
                card_array.append(each_card)
                card_data = card_array
        return render_template('cards.html', lem=lem, card_data=card_data)


    @app.route('/result/failed', methods=['GET'])
    def checkout_failure():
        return render_template('checkout-failed.html')

    @app.route('/result/pending', methods=['GET'])
    def checkout_pending():
        return render_template('checkout-success.html')

    @app.route('/result/error', methods=['GET'])
    def checkout_error():
        return render_template('checkout-failed.html')

    # Process incoming webhook notifications
    @app.route('/api/AnaBanana/notifications', methods=['POST'])
    def webhook_notifications():
        """
        Receives outcome of each payment
        :return:
        """
        # notifications = request.json['notificationItems']
        if request.method == 'POST':
            print("Data received from Webhook is: ", request.json)
            return '[accepted]'

        # for notification in notifications:
        #     if is_valid_hmac_notification(notification['NotificationRequestItem'], get_adyen_hmac_key()) :
        #         print(f"merchantReference: {notification['NotificationRequestItem']['merchantReference']} "
        #               f"result? {notification['NotificationRequestItem']['success']}")
        #     else:
        #         # invalid hmac: do not send [accepted] response
        #         raise Exception("Invalid HMAC signature")

    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(os.path.join(app.root_path, 'static'),
                                   'img/banana.png')

    initialise_db(app.root_path)


    return app


def page_not_found(error):
    return render_template('error.html'), 404


def initialise_db(directory_path):
    """Function to connect to SQLite DB, including DB creation and config if required"""

    # create path to DB file and store in config
    path_to_db_file = os.path.join(directory_path, 'app.sqlite')
    database.set_path_to_db_file(path_to_db_file)

    # check if DB file already exists - if not, execute DDL to create table
    if not exists(path_to_db_file):
        database.create_table()


if __name__ == '__main__':
    web_app = create_app()

    logging.info(f"Running on http://localhost:{get_port()}")
    web_app.run(debug=True, port=get_port(), host='0.0.0.0')


