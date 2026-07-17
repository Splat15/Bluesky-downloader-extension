import subprocess
import re
import os

output = subprocess.getoutput("adb devices")
device = re.findall("\n(\\S+)(?=\\s+(?:device|online))", output)

if(not output):
    print("No device attached")
    exit

device = device[0]

if(device):
    os.system("web-ext run -t firefox-android --adb-device " + device  + " --firefox-apk org.mozilla.firefox --arg='--new-tab=https://bsky.app'")