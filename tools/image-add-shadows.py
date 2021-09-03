import spinmob as sm
import os

opacity = 90 # Default opacity
opacity = 50 # Chess value

# Get all the paths you want to convert
paths = sm.dialogs.load_multiple()

# For each path
for path in paths:
    
    # Directory and file name
    d, f = os.path.split(path)
    
    # Filename and extension
    name, ext = os.path.splitext(f)
    
    # If there isn't an "originals" folder, make one
    o = os.path.join(d,'originals')
    if not os.path.exists(o): os.mkdir(o)
    
    # Move the original file into this path
    b = os.path.join(o,f)
    if not os.path.exists(b): os.rename(path, b)
    
    # Get the png path
    png = os.path.join(d,name)+'.png'
    
    # Now run the imagemagick
    command = r'convert "'+b+r'" \( +clone -background black -shadow '+str(opacity)+'x7+0+0 \) +swap -background none -layers merge +repage "'+png+'"'
    print(command)
    os.system(command)