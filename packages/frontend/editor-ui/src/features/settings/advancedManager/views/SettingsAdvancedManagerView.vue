<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

const rootStore = useRootStore();
const toast = useToast();
const i18n = useI18n();

interface UserRow {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
}

const users = ref<UserRow[]>([]);
const isLoadingUsers = ref(false);

const apiGet = async (path: string) => {
	const resp = await fetch(`${rootStore.restUrl}${path}`, {
		headers: { 'browser-id': rootStore.browserId ?? '' },
		credentials: 'include',
	});
	return await resp.json();
};

const apiPost = async (path: string, body: Record<string, unknown>) => {
	const resp = await fetch(`${rootStore.restUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'browser-id': rootStore.browserId ?? '',
		},
		credentials: 'include',
		body: JSON.stringify(body),
	});
	return await resp.json();
};

const loadUsers = async () => {
	isLoadingUsers.value = true;
	try {
		const data = await apiGet('/advanced-manager/users');
		users.value = data.data ?? data;
	} catch (e) {
		toast.showError(e as Error, 'Error loading users');
	} finally {
		isLoadingUsers.value = false;
	}
};

const promoteTo = async (userId: string, roleName: string) => {
	try {
		await apiPost(`/advanced-manager/users/${userId}/role`, { newRoleName: roleName });
		toast.showMessage({ title: 'Success', message: `User promoted to ${roleName}` });
		await loadUsers();
	} catch (e) {
		toast.showError(e as Error, 'Error promoting user');
	}
};

const shareFree = async () => {
	const credId = prompt('Enter Credential ID to share:');
	if (!credId) return;
	const userIdsStr = prompt('Enter User IDs (comma separated) to share with:');
	if (!userIdsStr) return;

	const userIds = userIdsStr.split(',').map((s) => s.trim());
	try {
		const res = await apiPost('/advanced-manager/credentials/share', { credentialId: credId, userIds });
		toast.showMessage({ title: 'Success', message: `Credential shared with ${(res.data ?? res).sharedCount} users` });
	} catch (e) {
		toast.showError(e as Error, 'Error sharing credential');
	}
};

onMounted(() => {
	loadUsers();
});
</script>

<template>
	<div class="advanced-manager-view">
		<h1>Advanced Manager (Unrestricted)</h1>
		<p>Manage all users and freely share credentials ignoring core license limits.</p>
		
		<div style="margin-bottom: 20px;">
			<el-button type="primary" @click="shareFree">Free Share Credential</el-button>
			<el-button @click="loadUsers" :loading="isLoadingUsers">Refresh</el-button>
		</div>

		<el-table :data="users" style="width: 100%" v-loading="isLoadingUsers">
			<el-table-column prop="id" label="ID" width="220" />
			<el-table-column prop="email" label="Email" />
			<el-table-column prop="firstName" label="First Name" />
			<el-table-column prop="lastName" label="Last Name" />
			<el-table-column prop="role" label="Current Role" />
			<el-table-column label="Actions" width="300">
				<template #default="scope">
					<el-button size="small" @click="promoteTo(scope.row.id, 'global:admin')" v-if="scope.row.role !== 'global:admin' && scope.row.role !== 'global:owner'">
						Make Admin
					</el-button>
					<el-button size="small" type="danger" @click="promoteTo(scope.row.id, 'global:owner')" v-if="scope.row.role !== 'global:owner'">
						Make Owner
					</el-button>
				</template>
			</el-table-column>
		</el-table>
	</div>
</template>

<style scoped>
.advanced-manager-view {
	padding: 24px;
	height: 100%;
	display: flex;
	flex-direction: column;
}
</style>
