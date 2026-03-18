<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useRestApi } from '@/composables/useRestApi';

const restApi = useRestApi();
const toast = useToast();
const i18n = useI18n();

const users = ref<Array<{id: string, firstName: string, lastName: string, email: string, role: string}>>([]);
const isLoadingUsers = ref(false);

const loadUsers = async () => {
	isLoadingUsers.value = true;
	try {
		users.value = await restApi.get('/advanced-manager/users');
	} catch (e) {
		toast.showError(e, 'Error loading users');
	} finally {
		isLoadingUsers.value = false;
	}
};

const promoteTo = async (userId: string, roleName: string) => {
	try {
		await restApi.post(`/advanced-manager/users/${userId}/role`, { newRoleName: roleName });
		toast.showMessage({ title: 'Success', message: `User promoted to ${roleName}` });
		await loadUsers();
	} catch (e) {
		toast.showError(e, 'Error promoting user');
	}
};

const shareFree = async () => {
	// A simple prompt to get credential and user IDs to simulate the free share functionality
	const credId = prompt('Enter Credential ID to share:');
	if (!credId) return;
	const userIdsStr = prompt('Enter User IDs (comma separated) to share with:');
	if (!userIdsStr) return;
	
	const userIds = userIdsStr.split(',').map(s => s.trim());
	try {
		const res = await restApi.post(`/advanced-manager/credentials/share`, { credentialId: credId, userIds });
		toast.showMessage({ title: 'Success', message: `Credential shared with ${res.sharedCount} users` });
	} catch (e) {
		toast.showError(e, 'Error sharing credential');
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
