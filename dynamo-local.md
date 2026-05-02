the code works on local json files as datastore like this 
if (isOffline()) {
      let clubs = await LocalStorage.listClubs();

      ths fetches the data from json files. 


To:do 

1) Bring up local dynamop db instance 
2) find table schema from code 
3) Seed the local json data into the local dynao db 
4) if env=local let the code connect to lcoal dynao db. 
5) No isOffline checks form code; it shoulkd run based on the flag of env
6) diff config files for local and non local env 
