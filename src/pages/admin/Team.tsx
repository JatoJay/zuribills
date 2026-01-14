import React, { useEffect, useMemo, useState } from 'react';
import { OrgMembership, Organization, User, UserRole } from '@/types';
import {
    deleteUser,
    getAccountMemberships,
    getOrganizationsByAccount,
    getUsersByAccount,
    removeOrgMembership,
    upsertOrgMembership,
} from '@/services/storage';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { Lock, Plus, Shield, Trash2 } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { apiFetch } from '@/services/apiClient';

const PERMISSIONS_LIST = [
    { id: 'MANAGE_INVOICES', label: 'Manage Invoices' },
    { id: 'MANAGE_CLIENTS', label: 'Manage Clients' },
    { id: 'MANAGE_SETTINGS', label: 'Manage Settings' },
];

type AccessMode = 'assign' | 'edit';

const Team: React.FC = () => {
    const { org, account, isOwner } = useAdminContext();
    const translationStrings = useMemo(() => ([
        'Team & Access',
        'Manage your team across all businesses.',
        'Add User',
        'You (Owner)',
        'Owner',
        'Full Access',
        'Full access across all businesses.',
        'Permissions:',
        'None',
        'PIN Set',
        'Add Team Member',
        'Name',
        'Email',
        'Role',
        'Permissions',
        'Access PIN (Optional)',
        'Cancel',
        'Add Member',
        'Remove this user?',
        'Manage Invoices',
        'Manage Clients',
        'Manage Settings',
        'Admin',
        'Assistant',
        'Assigned Businesses',
        'No business access yet.',
        'Assign to Business',
        'Edit Access',
        'Remove Access',
        'Business',
        'Select business',
        'Update Access',
        'Save Access',
        'Access for',
        'This user already has access to all businesses.',
        'Remove access for this business?',
        'Loading team...',
        'No team members yet.',
        'Business Access',
        'Select the businesses this member can manage.',
        'Current',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const accountId = account?.id || org?.accountId || '';
    const ownerId = account?.ownerUserId || org?.ownerId || '';
    const [users, setUsers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [memberships, setMemberships] = useState<OrgMembership[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [accessLoading, setAccessLoading] = useState(false);
    const [accessMode, setAccessMode] = useState<AccessMode>('assign');
    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [activeMembership, setActiveMembership] = useState<OrgMembership | null>(null);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: UserRole.ASSISTANT,
        permissions: [] as string[],
        pin: '',
        orgIds: [] as string[],
    });

    const [accessForm, setAccessForm] = useState({
        userId: '',
        organizationId: '',
        role: UserRole.ASSISTANT,
        permissions: [] as string[],
    });

    const permissionLabelMap = useMemo(() => {
        const map: Record<string, string> = {};
        PERMISSIONS_LIST.forEach((perm) => {
            map[perm.id] = t(perm.label);
        });
        return map;
    }, [t]);

    const orgById = useMemo(() => {
        const map = new Map<string, Organization>();
        organizations.forEach((organization) => map.set(organization.id, organization));
        return map;
    }, [organizations]);

    const membershipsByUser = useMemo(() => {
        const map = new Map<string, OrgMembership[]>();
        memberships.forEach((membership) => {
            const list = map.get(membership.userId) || [];
            list.push(membership);
            map.set(membership.userId, list);
        });
        return map;
    }, [memberships]);

    const ownerUser = useMemo(() => users.find((user) => user.id === ownerId), [users, ownerId]);
    const teamMembers = useMemo(
        () => users.filter((user) => user.id !== ownerId).sort((a, b) => a.name.localeCompare(b.name)),
        [users, ownerId]
    );

    useEffect(() => {
        if (accountId) {
            void loadTeam();
        }
    }, [accountId]);

    const loadTeam = async () => {
        setLoading(true);
        const [userData, orgData, membershipData] = await Promise.all([
            getUsersByAccount(accountId),
            getOrganizationsByAccount(accountId),
            getAccountMemberships(accountId),
        ]);
        setUsers(userData);
        setOrganizations(orgData);
        setMemberships(membershipData);
        setLoading(false);
    };

    const openCreateModal = () => {
        setNewUser({
            name: '',
            email: '',
            role: UserRole.ASSISTANT,
            permissions: [],
            pin: '',
            orgIds: org?.id ? [org.id] : [],
        });
        setIsCreateModalOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            // Provision user via backend to handle Auth and Welcome Email
            const response = await apiFetch('/api/team/provision', {
                method: 'POST',
                body: JSON.stringify({
                    accountId,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    organizationId: org.id,
                    permissions: newUser.role === UserRole.ADMIN ? ['ALL'] : newUser.permissions,
                    pin: newUser.pin,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.error || t('Failed to add team member.'));
            } else {
                setIsCreateModalOpen(false);
                await loadTeam();
            }
        } catch (error) {
            console.error('Failed to provision user', error);
            alert(t('Failed to add team member.'));
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('Remove this user?'))) return;
        await deleteUser(id);
        await loadTeam();
    };

    const handleRemoveAccess = async (membership: OrgMembership) => {
        if (!confirm(t('Remove access for this business?'))) return;
        await removeOrgMembership(membership.organizationId, membership.userId);
        await loadTeam();
    };

    const toggleNewUserPermission = (perm: string) => {
        setNewUser(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const toggleAccessPermission = (perm: string) => {
        setAccessForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const toggleOrgSelection = (orgId: string) => {
        setNewUser(prev => ({
            ...prev,
            orgIds: prev.orgIds.includes(orgId)
                ? prev.orgIds.filter(id => id !== orgId)
                : [...prev.orgIds, orgId],
        }));
    };

    const getUserMemberships = (userId: string) => {
        const list = membershipsByUser.get(userId) || [];
        return [...list].sort((a, b) => {
            const nameA = orgById.get(a.organizationId)?.name || '';
            const nameB = orgById.get(b.organizationId)?.name || '';
            return nameA.localeCompare(nameB);
        });
    };

    const getAvailableOrganizations = (userId: string) => {
        const assigned = new Set(getUserMemberships(userId).map((membership) => membership.organizationId));
        return organizations.filter((organization) => !assigned.has(organization.id));
    };

    const openAccessModal = (user: User, membership?: OrgMembership) => {
        const availableOrgs = getAvailableOrganizations(user.id);
        if (!membership && availableOrgs.length === 0) {
            alert(t('This user already has access to all businesses.'));
            return;
        }
        const targetOrgId = membership?.organizationId || availableOrgs[0]?.id || '';
        const role = membership?.role || UserRole.ASSISTANT;
        const permissions = membership?.permissions?.includes('ALL') ? [] : (membership?.permissions || []);
        setActiveUser(user);
        setActiveMembership(membership || null);
        setAccessMode(membership ? 'edit' : 'assign');
        setAccessForm({
            userId: user.id,
            organizationId: targetOrgId,
            role,
            permissions,
        });
        setIsAccessModalOpen(true);
    };

    const handleSaveAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessForm.userId || !accessForm.organizationId) return;
        setAccessLoading(true);
        await upsertOrgMembership({
            userId: accessForm.userId,
            organizationId: accessForm.organizationId,
            role: accessForm.role,
            permissions: accessForm.role === UserRole.ADMIN ? ['ALL'] : accessForm.permissions,
        });
        setAccessLoading(false);
        setIsAccessModalOpen(false);
        setActiveUser(null);
        setActiveMembership(null);
        await loadTeam();
    };

    const permissionSummary = (permissions: string[]) => {
        if (!permissions.length) return t('None');
        return permissions.map((permission) => permissionLabelMap[permission] || permission).join(', ');
    };

    const roleOptions = [
        { label: t('Admin'), value: UserRole.ADMIN },
        { label: t('Assistant'), value: UserRole.ASSISTANT },
    ];

    const accessOrgOptions = useMemo(() => {
        if (!activeUser) {
            return [{ label: t('Select business'), value: '' }];
        }
        if (accessMode === 'edit' && activeMembership) {
            const orgName = orgById.get(activeMembership.organizationId)?.name || t('Business');
            return [{ label: orgName, value: activeMembership.organizationId }];
        }
        const availableOrgs = getAvailableOrganizations(activeUser.id);
        return [
            { label: t('Select business'), value: '' },
            ...availableOrgs.map((organization) => ({ label: organization.name, value: organization.id })),
        ];
    }, [activeUser, accessMode, activeMembership, orgById, organizations, membershipsByUser, t]);

    if (!org.id) return <div className="p-8">Loading...</div>;
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t('Team & Access')}</h2>
                    <p className="text-sm text-muted">{t('Manage your team across all businesses.')}</p>
                </div>
                {isOwner && (
                    <Button onClick={openCreateModal}>
                        <Plus className="w-4 h-4 mr-2" /> {t('Add User')}
                    </Button>
                )}
            </div>

            {loading ? (
                <Card className="p-6 text-sm text-muted">{t('Loading team...')}</Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ownerUser && (
                        <Card className="p-6 border-l-4 border-l-primary">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {(ownerUser.name || org.name).charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{t('You (Owner)')}</h3>
                                        <p className="text-xs text-muted capitalize">{t('Owner')}</p>
                                    </div>
                                </div>
                                <Shield className="w-4 h-4 text-primary" />
                            </div>
                            <div className="mt-4 pt-4 border-t text-sm text-muted">
                                <p>{t('Full access across all businesses.')}</p>
                            </div>
                        </Card>
                    )}

                    {teamMembers.length === 0 && (
                        <Card className="p-6 text-sm text-muted">{t('No team members yet.')}</Card>
                    )}

                    {teamMembers.map(user => {
                        const userMemberships = getUserMemberships(user.id);
                        const availableOrgs = getAvailableOrganizations(user.id);
                        const isOwnerUser = user.id === ownerId;
                        return (
                            <Card key={user.id} className="p-6 relative">
                                {isOwner && !isOwnerUser && (
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
                                            {(user.name || 'U').charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold">{user.name}</h3>
                                        <p className="text-xs text-muted">{user.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-xs font-semibold uppercase text-muted">{t('Assigned Businesses')}</div>
                                    {userMemberships.length === 0 ? (
                                        <p className="text-sm text-muted">{t('No business access yet.')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {userMemberships.map((membership) => {
                                                const orgName = orgById.get(membership.organizationId)?.name || t('Business');
                                                return (
                                                    <div key={membership.id} className="rounded-xl border border-border/60 px-3 py-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-foreground">{orgName}</div>
                                                                <div className="text-xs text-muted mt-1">
                                                                    {membership.role === UserRole.ASSISTANT
                                                                        ? `${t('Permissions:')} ${permissionSummary(membership.permissions)}`
                                                                        : t('Full Access')}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <Badge status={membership.role} />
                                                                {isOwner && !isOwnerUser && membership.role !== UserRole.OWNER && (
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            className="h-8 px-3"
                                                                            onClick={() => openAccessModal(user, membership)}
                                                                        >
                                                                            {t('Edit Access')}
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            className="h-8 px-3 text-red-500 hover:text-red-600"
                                                                            onClick={() => handleRemoveAccess(membership)}
                                                                        >
                                                                            {t('Remove Access')}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {user.pin && (
                                    <div className="text-xs text-muted flex items-center gap-1 mt-4">
                                        <Lock className="w-3 h-3" /> {t('PIN Set')}
                                    </div>
                                )}

                                {isOwner && !isOwnerUser && availableOrgs.length > 0 && (
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={() => openAccessModal(user)}
                                    >
                                        {t('Assign to Business')}
                                    </Button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="max-w-lg w-full p-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4">{t('Add Team Member')}</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <Input
                                label={t('Name')}
                                required
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                            />
                            <Input
                                label={t('Email')}
                                type="email"
                                required
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            />

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">{t('Role')}</label>
                                <div className="flex gap-2">
                                    {[UserRole.ADMIN, UserRole.ASSISTANT].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewUser({
                                                ...newUser,
                                                role,
                                                permissions: role === UserRole.ADMIN ? [] : newUser.permissions,
                                            })}
                                            className={`flex-1 py-2 px-3 rounded text-sm font-medium border transition-colors ${newUser.role === role
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {role === UserRole.ADMIN ? t('Admin') : t('Assistant')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newUser.role === UserRole.ASSISTANT && (
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('Permissions')}</label>
                                    <div className="space-y-2">
                                        {PERMISSIONS_LIST.map(perm => (
                                            <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={newUser.permissions.includes(perm.id)}
                                                    onChange={() => toggleNewUserPermission(perm.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                                                />
                                                {t(perm.label)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('Business Access')}</label>
                                <p className="text-xs text-muted">{t('Select the businesses this member can manage.')}</p>
                                <div className="space-y-2 rounded-lg border border-border bg-surface px-3 py-3">
                                    {organizations.map((organization) => (
                                        <label key={organization.id} className="flex items-center gap-2 text-sm text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={newUser.orgIds.includes(organization.id)}
                                                onChange={() => toggleOrgSelection(organization.id)}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>{organization.name}</span>
                                            {organization.id === org.id && (
                                                <span className="text-xs text-primary">{t('Current')}</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Input
                                label={t('Access PIN (Optional)')}
                                placeholder="1234"
                                maxLength={4}
                                value={newUser.pin}
                                onChange={e => setNewUser({ ...newUser, pin: e.target.value })}
                            />

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>{t('Cancel')}</Button>
                                <Button type="submit" isLoading={createLoading}>{t('Add Member')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {isAccessModalOpen && activeUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full p-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-1">
                            {accessMode === 'edit' ? t('Update Access') : t('Assign to Business')}
                        </h3>
                        <p className="text-sm text-muted mb-4">
                            {t('Access for')} {activeUser.name}
                        </p>
                        <form onSubmit={handleSaveAccess} className="space-y-4">
                            <Select
                                label={t('Business')}
                                options={accessOrgOptions}
                                value={accessForm.organizationId}
                                onChange={(e) => setAccessForm(prev => ({ ...prev, organizationId: e.target.value }))}
                                disabled={accessMode === 'edit'}
                            />
                            <Select
                                label={t('Role')}
                                options={roleOptions}
                                value={accessForm.role}
                                onChange={(e) => setAccessForm(prev => ({
                                    ...prev,
                                    role: e.target.value as UserRole,
                                    permissions: e.target.value === UserRole.ADMIN ? [] : prev.permissions,
                                }))}
                            />

                            {accessForm.role === UserRole.ASSISTANT && (
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700">
                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('Permissions')}</label>
                                    <div className="space-y-2">
                                        {PERMISSIONS_LIST.map(perm => (
                                            <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={accessForm.permissions.includes(perm.id)}
                                                    onChange={() => toggleAccessPermission(perm.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                                                />
                                                {t(perm.label)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsAccessModalOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" isLoading={accessLoading}>
                                    {accessMode === 'edit' ? t('Update Access') : t('Save Access')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Team;
