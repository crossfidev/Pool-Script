Before starting be sure that a blockchain node has been installed 

Clone existing repository
<pre><code>git clone https://github.com/mineplexio/Pool-Script.git</code></pre>

Add submodule js-rpcapi 
<pre><code>git submodule add https://github.com/mineplexio/js-rpcapi.git</code></pre>

Install dependencies to js-rpcapi
<pre><code>cd js-rpcapi; npm install; cd ../</code></pre>

Copy from config-example.json to config.json and change this file up to you
<pre><code>cp config-example.json config.json</code></pre>

Run node process
<pre><code>npm run start</code></pre>