-- Add Pipedrive integration fields to startups table
ALTER TABLE startups 
ADD COLUMN pipedrive_deal_id INTEGER,
ADD COLUMN pipedrive_stage_id INTEGER,
ADD COLUMN pipedrive_pipeline_id INTEGER,
ADD COLUMN pipedrive_deal_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pipedrive_deal_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for Pipedrive lookups
CREATE INDEX idx_startups_pipedrive_deal_id ON startups(pipedrive_deal_id);
