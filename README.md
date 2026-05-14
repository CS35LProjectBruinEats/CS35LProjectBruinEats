For U5,6,7,8 follow the README in the main branch.

For adding location_name in the table use the following SQL:

```sql
ALTER TABLE foodopps ADD COLUMN location_name VARCHAR(100);
```


This command is needed to allow the map functionality to work:npm install react-leaflet leaflet 

For saving posts to personal schedule, add this SQL table:
psql -U postgres
\c foodopp_db

CREATE TABLE saved_opportunities (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    opp_id INT REFERENCES foodopps(opp_id),
    UNIQUE(user_id, opp_id)
);
