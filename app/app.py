import logging
import sqlite3
from os.path import exists

from Adyen.util import is_valid_hmac_notification
from flask import Flask, render_template, send_from_directory, request

from main import database
from main import config
from main.config import *
from main.onboard import go_to_link
from main.register import legal_entity
from main.store import *
from main.business import *

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

                # insert into database
                database.insert_user(email, password, lem_id)

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
        # database.delete_table()
        # database.force_create_table()
        lem_id = lem
        result = database.get_stores(lem_id)
        print("this is the result ", result)
        res = [sub['storeName'] for sub in result ]
        # existingStoreNames = [item[0] for item in result]
        # print(existingStoreNames)
        # if result:
        #     print(result[0]['storeName'])
        return render_template('onboard-success.html', result=res)

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
        print("this is the result ", result)
        res = [sub['storeName'] for sub in result ]
        return render_template('dashboard.html', lem=lem, newUser=False, result=res)

    @app.route('/onboard/<lem>', methods=['POST', 'GET'])
    def onboard_link(lem):
        if request.method == 'POST':
            LEMid = lem
        return go_to_link(LEMid)

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


