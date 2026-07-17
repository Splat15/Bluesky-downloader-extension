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
    os.system("scrcpy --video-bit-rate=24m --audio-dup --max-fps=60 --video-codec=h265 --stay-awake -s " + device)