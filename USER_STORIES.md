# UCLA Food Opportunity Platform

## Project Description
Our project is a platform for UCLA students to find free or discounted food on campus to supplement their meal plans. UCLA students can add food opportunities and see and filter through opportunities that other students have added. Clubs and food vendors can also post opportunities to advertise their events or food.

This platform is innovative, helps combat food insecurity, and makes smaller meal plans like 11R and 14R more realistic for students without additional food sources.

---

## User Stories

### Must Have

#### User Story 1 (Finish by Week 4)
**As a** food vendor / UCLA student  
**I want to** create an account  
**So that** I can advertise my events or food / access account-only features  

**Acceptance Criteria:**
- Given I am on the account creation page  
  When I provide an unused username and password  
  Then I can create an account  

- Given I am on the account creation page  
  When I enter a username that has already been used  
  Then I will see an error that the username is taken  

---

#### User Story 2 (Depends on #1, Finish by Week 4/5)
**As a** food vendor / UCLA student  
**I want to** log in  
**So that** I can access account features  

**Acceptance Criteria:**
- Given I am on the login page  
  When I enter correct credentials  
  Then I can log in  

- Given I am on the login page  
  When I enter incorrect credentials  
  Then I will see an error prompting retry or account creation  

---

#### User Story 3 (Depends on #1, #2, Finish by Week 5)
**As a** food vendor  
**I want to** add food opportunities  
**So that** I can advertise them  

**Acceptance Criteria:**
- Given I am logged in  
  When I navigate to the creation page  
  Then I can enter and upload opportunity details  

- Given I have posted an opportunity  
  When users view opportunities  
  Then they can see my post  

---

#### User Story 4 (Depends on #3, Finish by Week 5)
**As a** UCLA student / food vendor  
**I want to** view food opportunities  
**So that** I can decide which to attend  

**Acceptance Criteria:**
- Given opportunities exist  
  When I view the list  
  Then I see all available opportunities  

- Given no opportunities exist  
  When I view the list  
  Then I see a message indicating none are available  

---

### Should Have

#### User Story 5 (Depends on #1–#3, Finish by Week 6)
**As a** food vendor  
**I want to** edit opportunities  
**So that** I can update information  

**Acceptance Criteria:**
- Given I posted an opportunity  
  When I select it  
  Then I can edit and save changes  

- Given updates are saved  
  When users view the opportunity  
  Then they see updated information  

---

#### User Story 6 (Depends on #1–#3, Finish by Week 6/7)
**As a** food vendor  
**I want to** delete opportunities  
**So that** I can remove outdated ones  

**Acceptance Criteria:**
- Given I posted an opportunity  
  When I select delete  
  Then it is removed  

- Given an opportunity is deleted  
  When users view listings  
  Then it no longer appears  

---

#### User Story 7 (Depends on #3, #4, Finish by Week 7)
**As a** UCLA student  
**I want to** filter opportunities  
**So that** I can find relevant ones  

**Acceptance Criteria:**
- Given opportunities exist  
  When I apply filters  
  Then I see only matching opportunities  

---

### Nice to Have

#### User Story 8 (Depends on #3, #4, Finish by Week 8)
**As a** UCLA student  
**I want to** view opportunities on a map  
**So that** I can see locations visually  

**Acceptance Criteria:**
- Given opportunities exist  
  When I open map view  
  Then I see them on a UCLA map  

- Given none exist  
  Then I see only the map  

- Given I select a marker  
  Then I see opportunity details  

---

#### User Story 9 (Depends on #1–#4, Finish by Week 8/9)
**As a** UCLA student  
**I want to** add opportunities to my schedule  
**So that** I can plan ahead  

**Acceptance Criteria:**
- Given I select an opportunity  
  When I add it  
  Then it appears in my schedule  

- Given I view my schedule  
  Then I see saved opportunities  

- Given I try to add a duplicate  
  Then I see an error  

---

#### User Story 10 (Depends on #1–#4, Finish by Week 9)
**As a** UCLA student  
**I want to** RSVP to events  
**So that** I can reserve a spot  

**Acceptance Criteria:**
- Given I select RSVP  
  Then my spot is reserved  

- Given event is full  
  Then RSVP is blocked  

- Given I cancel RSVP  
  Then my spot is freed  

---

#### User Story 11 (Depends on #1–#4, Finish by Week 9/10)
**As a** UCLA student  
**I want to** post comments  
**So that** I can share experiences  

**Acceptance Criteria:**
- Given I write a comment  
  Then it is posted  

- Given I submit empty input  
  Then I see an error  

- Given comments exist  
  Then others can view them  

---

## Intermediate Milestones

- Users can create accounts, log in, and access the app  
- Users can add and view food opportunities  
- Users can filter opportunities by date and type  
