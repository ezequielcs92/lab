-- Migration: Add fotografo role to rol_usuario enum
-- Run this in your Supabase SQL Editor

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'fotografo';
