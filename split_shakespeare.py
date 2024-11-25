#Script to split the complete works of Shakespeare (from Project Gutenberg) into chunks.
#The file has already been manually separated into 3 files: sonnets, plays, and other verse.
#The output files will be created in a directory called shakespeare_split, prefixed by s, p, or v, respectively, and then numbered sequentially.

import re
import os
import shutil

# remove output dir if it exists, and then recreate it, to get clean output
dirname = "shakespeare_split"
if os.path.exists(dirname):
    shutil.rmtree(dirname)
os.mkdir(dirname)

# general-purpose function for splitting each type of text (sonnets, plays, other verse)
def splitfile(filename,prefix,regex):
    fileno = 0
    outfilelines = 0 # to keep count of lines in outfile, so we can skip over any 0-line or 1-line files
    
    outfile = open(dirname + "/" + prefix + str(fileno), "w") # open file e.g. "s1" for write


    f = open(filename, "r")        
    for line in f.read().splitlines():
        
        if (re.match(regex,line)): #we've reached a boundary, as determined by the "regex" argument
            outfile.close()
            
            if (outfilelines > 1):
                fileno += 1         #increment the file number only if lines>1, otherwise just reuse this number
                outfilelines = 0    #reset for new outfile
            outfile = open(dirname + "/" + prefix + str(fileno), "w") #open new outfile
            
        if (re.match("^$", line)):
            continue;               #don't bother writing blank lines
            
        outfile.write(line + "\n")  #write the line, with line break, and increment the outfileline count
        outfilelines += 1

    outfile.close()
    f.close()   




splitfile("sonnets.txt","s","^\s+\d") # split sonnets on several spaces followed by a numeral
splitfile("plays.txt","p","^SCENE [IV]") # split plays by scene: SCENE I, II, III, IV, or V
splitfile("verse.txt","v","^$") # split other verse by stanzas (blank lines)
