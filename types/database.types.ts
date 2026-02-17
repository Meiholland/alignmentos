export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      startups: {
        Row: {
          id: string
          company_name: string
          industry: string | null
          stage: string | null
          geography: string | null
          raise_amount: number | null
          planned_close_date: string | null
          board_structure_description: string | null
          deal_partner: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          industry?: string | null
          stage?: string | null
          geography?: string | null
          raise_amount?: number | null
          planned_close_date?: string | null
          board_structure_description?: string | null
          deal_partner?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          industry?: string | null
          stage?: string | null
          geography?: string | null
          raise_amount?: number | null
          planned_close_date?: string | null
          board_structure_description?: string | null
          deal_partner?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      founders: {
        Row: {
          id: string
          startup_id: string
          full_name: string
          role: string | null
          email: string
          equity_percentage: number | null
          full_time_status: boolean
          years_known_cofounders: number | null
          prior_startup_experience: boolean
          previously_worked_together: boolean
          is_ceo: boolean
          survey_status: string
          interview_status: string
          survey_token: string
          survey_token_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          full_name: string
          role?: string | null
          email: string
          equity_percentage?: number | null
          full_time_status?: boolean
          years_known_cofounders?: number | null
          prior_startup_experience?: boolean
          previously_worked_together?: boolean
          is_ceo?: boolean
          survey_status?: string
          interview_status?: string
          survey_token?: string
          survey_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          full_name?: string
          role?: string | null
          email?: string
          equity_percentage?: number | null
          full_time_status?: boolean
          years_known_cofounders?: number | null
          prior_startup_experience?: boolean
          previously_worked_together?: boolean
          is_ceo?: boolean
          survey_status?: string
          interview_status?: string
          survey_token?: string
          survey_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      survey_questions: {
        Row: {
          id: string
          version: number
          dimension: string
          question_text: string
          question_order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          version?: number
          dimension: string
          question_text: string
          question_order: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          version?: number
          dimension?: string
          question_text?: string
          question_order?: number
          active?: boolean
          created_at?: string
        }
      }
      survey_responses: {
        Row: {
          id: string
          founder_id: string
          question_id: string
          response_value: number
          submitted_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          question_id: string
          response_value: number
          submitted_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          question_id?: string
          response_value?: number
          submitted_at?: string
        }
      }
      interview_transcripts: {
        Row: {
          id: string
          founder_id: string
          raw_text: string
          file_url: string | null
          file_name: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          founder_id: string
          raw_text: string
          file_url?: string | null
          file_name?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          founder_id?: string
          raw_text?: string
          file_url?: string | null
          file_name?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
      }
      diagnostic_reports: {
        Row: {
          id: string
          startup_id: string
          analysis_json: Json
          executive_summary: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          analysis_json: Json
          executive_summary: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          analysis_json?: Json
          executive_summary?: string
          created_at?: string
          created_by?: string | null
        }
      }
    }
  }
}
