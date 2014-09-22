var noble = require('./index');
var mqtt = require('mqtt');
var math = require('mathjs');

var client = mqtt.createClient(2883, '207.141.192.241');

console.log('noble');

noble.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    var allowDuplicates = true;
    noble.startScanning([], allowDuplicates);
  } else {
    noble.stopScanning();
  }
});

noble.on('scanStart', function() {
  console.log('on -> scanStart');
});

noble.on('scanStop', function() {
  console.log('on -> scanStop');
});

var Distance = 0.0;
var refRSSI = 0.0;
// distance calc
// RSSI = -10 * nLog(d) + A;
// d = Distance
// A = RSSI at 1 meter
// n = propogation constant.. 2.4
// RSSI - A = -10 * nLog(d)
// (RSSI - A)/-10n = Log(d)
// 10^((RSSI - A)/-10n) = d 
// distance = :w


noble.on('discover', function(peripheral) {
  console.log('on -> discover: ' + peripheral);
  //send out to mqtt
  console.log('send this to mqtt: ' + JSON.stringify(peripheral.advertisement));
  client.publish('ATL_FOUNDRY/BLE_SCANNER', JSON.stringify(peripheral.advertisement));
  var obj = peripheral;
  console.log('measuered rssi: ' + peripheral.rssi);
  console.log(peripheral.advertisement.manufacturerData ? 'ref RSSI: ' + peripheral.advertisement.manufacturerData[24] : 'no ref RSSI' );

  if (peripheral.advertisement.manufacturerData)
  {
    if(peripheral.advertisement.manufacturerData[24])
    {
      var sign = "";
      var t = peripheral.advertisement.manufacturerData[24];
      var topBit = 128;
      var comp = t;
      if ((t&topBit) == topBit)
      {
        sign = "-";
        var mask = 255;
        comp=((t^mask)+1)*(-1.0);
      }
      console.log('ref RSSI: ' +  comp);
      refRSSI = comp;
    }
  }

  var CurrentRSSI = peripheral.rssi;
  var CurrentPropogationConstant = 2.4;
  if (!refRSSI)
  {
    refRSSI = -60.0;
  }
  var DistanceScope =
  {
    CurrentRSSI : peripheral.rssi,
    CurrentProp : 2.4,
    CurrentRefRSSI : refRSSI, //-60.0,
    n : 2.4
  };
  distance = math.eval('10^((CurrentRSSI - CurrentRefRSSI)/(-10 * n))', DistanceScope);
  console.log('distance= ' + distance);
  //console.log(peripheral);
  if (peripheral.advertisement.manufacturerData)
  {
    console.log(peripheral.advertisement.manufacturerData.toString('hex'));
    //console.log('manufacturer data only: ' + peripheral.advertisment.manufacturerData.toString('hex'));
  }
  //noble.stopScanning();

  peripheral.on('connect', function() {
    console.log('on -> connect');
    this.updateRssi();
  });

  peripheral.on('disconnect', function() {
    console.log('on -> disconnect');
  });

  peripheral.on('rssiUpdate', function(rssi) {
    console.log('on -> RSSI update ' + rssi);
    this.discoverServices();
  });

  peripheral.on('servicesDiscover', function(services) {
    console.log('on -> peripheral services discovered ' + services);

    var serviceIndex = 0;

    services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
      console.log('on -> service included services discovered ' + includedServiceUuids);
      this.discoverCharacteristics();
    });

    services[serviceIndex].on('characteristicsDiscover', function(characteristics) {
      console.log('on -> service characteristics discovered ' + characteristics);

      var characteristicIndex = 0;

      characteristics[characteristicIndex].on('read', function(data, isNotification) {
        console.log('on -> characteristic read ' + data + ' ' + isNotification);
        console.log(data);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('write', function() {
        console.log('on -> characteristic write ');

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('broadcast', function(state) {
        console.log('on -> characteristic broadcast ' + state);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('notify', function(state) {
        console.log('on -> characteristic notify ' + state);

        peripheral.disconnect();
      });

      characteristics[characteristicIndex].on('descriptorsDiscover', function(descriptors) {
        console.log('on -> descriptors discover ' + descriptors);

        var descriptorIndex = 0;

        descriptors[descriptorIndex].on('valueRead', function(data) {
          console.log('on -> descriptor value read ' + data);
          console.log(data);
          peripheral.disconnect();
        });

        descriptors[descriptorIndex].on('valueWrite', function() {
          console.log('on -> descriptor value write ');
          peripheral.disconnect();
        });

        descriptors[descriptorIndex].readValue();
        //descriptors[descriptorIndex].writeValue(new Buffer([0]));
      });


      characteristics[characteristicIndex].read();
      //characteristics[characteristicIndex].write(new Buffer('hello'));
      //characteristics[characteristicIndex].broadcast(true);
      //characteristics[characteristicIndex].notify(true);
      // characteristics[characteristicIndex].discoverDescriptors();
    });

    
    services[serviceIndex].discoverIncludedServices();
  });

//  peripheral.connect();
});

