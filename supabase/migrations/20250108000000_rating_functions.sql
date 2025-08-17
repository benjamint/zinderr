-- Create function to calculate average rating for a user
CREATE OR REPLACE FUNCTION calculate_average_rating(user_id uuid)
RETURNS decimal AS $$
DECLARE
  avg_rating decimal;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM mutual_ratings
  WHERE rated_id = user_id;
  
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Create function to get total ratings count for a user
CREATE OR REPLACE FUNCTION get_total_ratings(user_id uuid)
RETURNS integer AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM mutual_ratings
  WHERE rated_id = user_id;
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql;
