# AFP Onboarding demo

## Details

This repository is an example of how to implement the Adyen's Balance Platform APIs for onboarding in a UI.

**Python with Flask** demo.

## Requirements

- Python 3.5 or greater
- Python libraries:
  - flask
  - uuid
  - requests

## Installation

1. Clone this repo

```
git clone https://github.com/anamotaadyen/OnboardingDemoAFP.git
```

2. Run `source ./setup.sh` to:
   - Create and activate a virtual environment
   - Download the necessary python dependencies

3. Create a `.env` file with all required configuration

   - PORT (default 8080)
   - [API key](https://docs.adyen.com/user-management/how-to-get-the-api-key)
   - [Merchant Account](https://docs.adyen.com/account/account-structure)
   - LEM Credentials 
   - Balance Platform Credentials


```
    PORT=8080
    ADYEN_API_KEY="your_API_key_here"
    ADYEN_MERCHANT_ACCOUNT="your_merchant_account_here"
    LEM_USER="your LEM username ...@Scope.Company_<CompanyName>"
    LEM_PASS="your LEM password"
    BP_USER="yout Balance Platform username ...@BalancePlatform.<BP_Name>"
    BP_PASS="your Balance Platform password"
```

## Usage
1. Run `./start.sh` to:
   - Initialize the required environment variables. This step is necessary every time you re-activate your venv
   - Start Python app

2. Visit [http://localhost:8080](http://localhost:8080) to launch the demo!

## Contributing

We commit all our new features directly into our GitHub repository. Feel free to request or suggest new features or code changes yourself as well!!

## License

MIT license. For more information, see the **LICENSE** file in the root directory
