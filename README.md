Before starting be sure that a blockchain node has been installed 

Clone existing repository
  git clone https://github.com/mineplexio/Pool-Script.git

Add submodule js-rpcapi 
  git submodule add https://github.com/mineplexio/js-rpcapi.git

Install dependencies to js-rpcapi
  cd js-rpcapi; npm install; cd ../

Copy from config-example.json to config.json and change this file up to you
  cp config-example.json config.json

Run node process
  npm run start