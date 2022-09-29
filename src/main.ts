import * as k8s from '@kubernetes/client-node';
import {V1Ingress} from '@kubernetes/client-node';
import Consul from 'consul';
import Service = Consul.Agent.Service;

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const consul = new Consul();

const log = console.log;

const getHostnames = (ingress: V1Ingress) => {
    return ingress.status?.loadBalancer?.ingress?.map((lb) => lb.ip);
};

const registerIngress = (ingress: V1Ingress) => {
    const hostnames = getHostnames(ingress) || [];
    const hostname = hostnames.length > 0 ? hostnames[0] : null;
    const opts: Service.RegisterOptions = {
        name: ingress.metadata!.name!,
        id: ingress.metadata!.name,
        address: hostname || undefined,
    };
    consul.agent.service.register(opts).catch((err) =>

        console.log(err));
};

const watch = new k8s.Watch(kc);
watch.watch('/apis/networking.k8s.io/v1/ingresses',
    // optional query parameters can go here.
    {},
    // callback is called for each received object.
    (type, ingress, watchObj) => {
        const el = ingress as V1Ingress;

        if (type === 'ADDED') {
            log('new ingress', el, getHostnames(ingress));

            registerIngress(ingress);
        } else if (type === 'MODIFIED') {
            log('ingress modified', el, el.status);
            registerIngress(ingress);
        } else if (type === 'DELETED') {
            log('ingress deleted', el, el.status);
        }
    },
    // done callback is called if the watch terminates normally
    (err) => {

        console.log(err);
    });