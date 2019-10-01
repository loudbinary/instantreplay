import RPi.GPIO as GPIO # Import Raspberry Pi GPIO library
# importing the requests library
import requests
import time
# api-endpoint
URL = "http://192.168.30.30:3000/instantreplay?start=1"

def button_callback(channel):
    print("Calling instant replay webhook!")
    r = requests.get(url = URL)
    time.sleep(0.3)

GPIO.setwarnings(True) # Ignore warning for now
GPIO.setmode(GPIO.BOARD) # Use physical pin numbering
GPIO.setup(12, GPIO.IN, pull_up_down=GPIO.PUD_UP) # Set pin 12 to be an input pi                                                                                                             n and set initial value to be pulled high (off)
GPIO.add_event_detect(12,GPIO.FALLING,callback=button_callback) # Setup event on                                                                                                              pin 12 rising edge
message = input("Press enter to quit\n\n") # Run until someone presses enter
GPIO.cleanup() # Clean up

