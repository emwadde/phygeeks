# Instructions

- Create a google sheet with 2 sheets (Regions and Schools) and publish both as csv
    - Regions sheet:
        - Col A: Atoll
        - Col B: Island
    - Schools sheet:
        - Col A: School Name
   - Publish both sheets seperately and copy the published URLs to .env file
 - Create another sheet for collecting application form data.
	 - Add a sheet named "Applications".
	 - Copy the contents of `Apps Script/Code.gs` to the Apps Script
	 - Deploy the App Script as a Web App with
		 - `Execute as: me`
		 - `Who has access: Anyone`
	 - Copy the Web app URL to .env file
 - Commit changes to repo
 - Goto Cloudflare and create a new Page and choose from GitHub repo

 