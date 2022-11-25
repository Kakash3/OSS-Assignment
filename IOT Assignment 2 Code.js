//Establishing a connection to the broker
var mqtt = require('mqtt')
var mqttClient  = mqtt.connect('mqtt://broker.mqttdashboard.com');
var topicToPublishTo="dispenser/nofPresses"
var topicToSubscribeTo="dispenser/LED"

//MAC Address of microbit
const deviceOfInterest = 'D9:A1:D4:41:27:8B'

//Data sent to the MQTT broker for the LED
const serviceOfInterestUuid = '00000001-0002-0003-0004-000000003000' //uuid of LED service
const characteristicOfInterestUuid = '00000001-0002-0003-0004-000000003001' //uuid of read/write characteristic of LED service

//Data sent to the MQTT broker for the Button
const notifyServiceOfInterestUuid = '00000001-0002-0003-0004-000000002000' //uuid of button service
const notifyCharacteristicOfInterestUuid = '00000001-0002-0003-0004-000000002001' //uuid of read/write characteristic of button service

//Variable used for button service
var notifyChar;

//MQTT events and handlers
//mqttClient.on('connect', connectCallback); //when a 'connect' event is received call the connectCallback listener function

//Connection has been established to the MQTT broker & a subscriptions have been made        
function connectCallback() {
  console.log("connected to cloud MQTT broker");
  mqttClient.subscribe(topicToSubscribeTo, subscribeCallback);
}

//function runs to do error-checking
function writeDataCallback(error, data) { 
	if (error) {
		console.log("error writing data");
	} else {	
		//disconnect the central device from the peripheral device
		//peripheralGlobal.disconnect(disconnectCallback); //this should not be called until all characteristics for a service have been read/written to
		//if the program is terminated manually enter the command 'sudo service bluetooth restart' to disconnect the peripheral
	}
}

//subscribing to "dispenser/LED" from MQTT broker
mqttClient.subscribe(topicToSubscribeTo, subscribeCallback);
//callback function is called to check if the gateway has subcribed to the MQTT broker
function subscribeCallback(error, granted) {     
   	if (error) {
		console.log("error subscribing to topic");
	} else {	 
        console.log("Subscribed to broker on topic" + topicToSubscribeTo+ "'");
    }
}

//callback function is called to check if the gateway has subcribed to the MQTT broker
function publishCallback(error) {     
   	if (error) {
		console.log("error publishing data");
	} else {	 
        console.log("Message is published to topic '" + topicToPublishTo+ "'");
        //mqttClient.end(); // Close the connection to the broker when published
    }
}

//async keyword says function should execute asynchronously 
const main = async() => {
  const {createBluetooth}=require('node-ble') //nodejs ble module/library
  const { bluetooth, destroy } = createBluetooth()

  // get bluetooth adapter
  const adapter = await bluetooth.defaultAdapter() //get an available Bluetooth adapter
  await adapter.startDiscovery() //using the adapter, start a device discovery session  
  console.log('discovering')
  
  // look for a specific device 
  const device = await adapter.waitDevice(deviceOfInterest)
  console.log('got device', await device.getAddress())
  const deviceName = await device.getName()
  console.log('got device remote name', deviceName)
  console.log('got device user friendly name', await device.toString())	
  await adapter.stopDiscovery() 
  
  //connect to the specific device
  await device.connect()
  console.log("connected to device : " + deviceName)
  
  //services of device displayed
  const gattServer = await device.gatt()
  services = await gattServer.services()
  console.log("services are " + services)

  //If statement to display button output from user input in broker
  if (services.includes(notifyServiceOfInterestUuid)) { //uuid of service for button
	  console.log('got the button service')
	  const primaryNotifyService = await gattServer.getPrimaryService(notifyServiceOfInterestUuid)
	  const notifyChar = await primaryNotifyService.getCharacteristic(notifyCharacteristicOfInterestUuid)
	  console.log("characteristic flags are : " + await notifyChar.getFlags())
	  await notifyChar.startNotifications()	  
	  notifyChar.on('valuechanged', buffer => {console.log("button A pressed"); 
	  mqttClient.publish(topicToPublishTo, "button A pressed", publishCallback);})	  
	  //await charact.stopNotifications()  
  }

  
    //If statement to display LED output with BLE from user in broker
  if (services.includes(serviceOfInterestUuid)) 
  {  
	  console.log('got the LED service')
	  const primaryService = await gattServer.getPrimaryService(serviceOfInterestUuid)
	  const chars = await primaryService.characteristics()
	  console.log("the service characteristics are : " + chars)
      console.log("uuid of characteristic of interest is : " + characteristicOfInterestUuid) 
	  charact = await primaryService.getCharacteristic(characteristicOfInterestUuid)
	  console.log("characteristic flags are : " + await charact.getFlags())
	  
	  
	  mqttClient.on("message", async (topic, message) => {
	  console.log("got a message:" + message);
	  
	  converted = String(message);
	  
	  if(converted == "on"){
	  await charact.writeValue(Buffer.from([01])); //write to LED characteristic to turn LED on
	  console.log("LED is on");
      } else if (converted == "off"){
	  await charact.writeValue(Buffer.from([00])); //write to LED characteristic to turn LED off
	  console.log("LED is off");
	  }
	  
	  
	  
  })
  
}
 
}

main()
  .then()
  .catch(console.error)
  













