

SELECT * FROM community_admins
INNER JOIN users ON users.id = community_admins.user_id;

