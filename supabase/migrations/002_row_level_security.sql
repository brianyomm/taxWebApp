-- Row Level Security Policies
-- Ensures multi-tenant data isolation

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id
        FROM users
        WHERE clerk_id = auth.jwt() ->> 'sub'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM users
        WHERE clerk_id = auth.jwt() ->> 'sub'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = get_user_organization_id());

CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (id = get_user_organization_id() AND is_org_admin());

-- Users policies
CREATE POLICY "Users can view members of their organization"
    ON users FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Admins can insert users in their organization"
    ON users FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_org_admin());

CREATE POLICY "Admins can delete users in their organization"
    ON users FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_org_admin());

-- Clients policies
CREATE POLICY "Users can view clients in their organization"
    ON clients FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert clients in their organization"
    ON clients FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete clients in their organization"
    ON clients FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_org_admin());

-- Documents policies
CREATE POLICY "Users can view documents in their organization"
    ON documents FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert documents in their organization"
    ON documents FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update documents in their organization"
    ON documents FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete documents in their organization"
    ON documents FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_org_admin());

-- Tasks policies
CREATE POLICY "Users can view tasks in their organization"
    ON tasks FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert tasks in their organization"
    ON tasks FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update tasks in their organization"
    ON tasks FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete tasks in their organization"
    ON tasks FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Audit logs policies (read-only for users)
CREATE POLICY "Users can view audit logs in their organization"
    ON audit_logs FOR SELECT
    USING (organization_id = get_user_organization_id());

-- Service role can insert audit logs (from API)
CREATE POLICY "Service role can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Document checklists policies
CREATE POLICY "Users can view checklists in their organization"
    ON document_checklists FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage checklists in their organization"
    ON document_checklists FOR ALL
    USING (organization_id = get_user_organization_id() AND is_org_admin());

-- Client checklist progress policies
CREATE POLICY "Users can view client checklist progress"
    ON client_checklist_progress FOR SELECT
    USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can manage client checklist progress"
    ON client_checklist_progress FOR ALL
    USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id = get_user_organization_id()
        )
    );

-- Special policy for client portal access (using portal_access_token)
-- This allows clients to access their own data via the portal
CREATE OR REPLACE FUNCTION verify_portal_token(token TEXT, client_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM clients
        WHERE id = client_uuid
        AND portal_access_token = token
        AND portal_access_expires > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
