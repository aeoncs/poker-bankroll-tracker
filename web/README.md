Project Proposal - 

A poker bankroll tracker. A website that allows users to login and create
multiple bankrolls to track different poker session wins and losses. After entering
data users will be able to filter their entries/sessions with multiple filters
in order to get a better standing of their performance.

User Flow - https://www.figma.com/site/jFdPVykXojItnMEJINyB7K/Untitled?node-id=0-1&t=dNQbOF9fiGGh5Bwu-1


Database Schema

Users - ID(req),Email(req), Password(req), Bankroll(s)[Added After Creation - Required for Session Creation]

Bankrolls - ID(req),Name(req), Currency(req), Starting Amount(req)

Sessions - Userid(req), Bankrollid(req), Entry Type(cash or tourney)(req), Data(req), Currency(from bankroll), Game Type,Start&End time, Location, Notes

----------Cash Entries in Sessions
    Stakes,Buyin,Cashout,Duration

----------Tournament Entries in Sessions
    Fee,rebuys,addons,winngs,finishing position,# of entrants



API - 

API Endpoint = Get => "/login" => Login Page

API Endpoint = POST => /login => Result
    Successful login will redirect user to Dashboard(or Setup if onboarding not complete)

    Failure will return error.

API Endpoint = POST => "/register" => Register user in database

API Endpoint = POST/PUT/DEL => "/sessions" => Create/Update/Delete Sessions

API Endpoint = POST => "setup" => Initial setup of user settings
API Endpoint = PUT => "settings" => Edit user settings

API Endpoint = POST/PUT/Del => "bankrolls" => Create,Edit,Delete bankrolls

    
API Endpoint = POST => "/logout" => Logs user out of session

